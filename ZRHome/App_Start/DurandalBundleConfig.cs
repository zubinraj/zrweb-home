using System;
using System.Web.Optimization;

namespace ZRHome {
  public class DurandalBundleConfig {
    public static void RegisterBundles(BundleCollection bundles) {
      bundles.IgnoreList.Clear();
      AddDefaultIgnorePatterns(bundles.IgnoreList);

	  bundles.Add(
		new ScriptBundle("~/Scripts/js")
            // Moved this to Index.cshtml to add jquery version conditionally
			//.Include("~/Scripts/jquery-{version}.js")

            .Include("~/Scripts/bootstrap.js")
			
            .Include("~/Scripts/knockout-{version}.js")
            .Include("~/Scripts/jquery.isotope.js")
            //.Include("~/Scripts/toastr.js")
            .Include("~/Scripts/jquery.lazyload.js")
            .Include("~/Scripts/jquery.fancybox.js")
            .Include("~/Scripts/jquery.fancybox-buttons.js")
            .Include("~/Scripts/jquery.fancybox-media.js")
            .Include("~/Scripts/jquery.fancybox-thumbs.js")

        );

      bundles.Add(
        new StyleBundle("~/Content/css")
          .Include("~/Content/bootstrap.css")       
          .Include("~/Content/bootstrap-theme.css")
          .Include("~/Content/ie10mobile.css")
		  .Include("~/Content/durandal.css")
          .Include("~/Content/site.css")
          .Include("~/Content/isotope.css")
          //.Include("~/Content/toastr.css")
          .Include("~/Content/jquery.fancybox.css")
          .Include("~/Content/jquery.fancybox-buttons.css")
          .Include("~/Content/jquery.fancybox-thumbs.css")
);
    }

    public static void AddDefaultIgnorePatterns(IgnoreList ignoreList) {
      if(ignoreList == null) {
        throw new ArgumentNullException("ignoreList");
      }

      ignoreList.Ignore("*.intellisense.js");
      ignoreList.Ignore("*-vsdoc.js");
      ignoreList.Ignore("*.debug.js", OptimizationMode.WhenEnabled);
      ignoreList.Ignore("*.min.js", OptimizationMode.WhenDisabled);
      ignoreList.Ignore("*.min.css", OptimizationMode.WhenDisabled);

    }
  }
}